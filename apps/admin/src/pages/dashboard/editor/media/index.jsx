// pages/media/index.js
import React, { useContext, useState, useEffect } from 'react';
import UploadComponent from "../../../../components/common/DAM/UploadComponent"
import AssetDetailView from '../../../../components/common/DAM/AssetDetailView';
import AssetLibrary from '../../../../components/common/DAM/AssetLibrary';

import { toast } from 'react-hot-toast';
import { SideBar } from "../../../../components/SideBar/SideBar";
import DashboardSidebar from '../../../../components/ui/DashboardSidebar';
import { UserContext } from '../../../../context/UserContext';
import BackToDashboardButton from '../../../../components/common/BackToDashboardButton';
import { useRouter } from '@/hooks/useRouter';
import env from '@/utils/env';
import apiFetch from '../../../../utils/api';


const DAMContainer = () => {
    const [currentView, setCurrentView] = useState('library'); // 'upload', 'detail', 'library'
    const [uploadedAsset, setUploadedAsset] = useState(null);
    const [assets, setAssets] = useState([]); // Store uploaded assets
    const { user } = useContext(UserContext);
    const router = useRouter();
    // Part B: Redirect to login if no user
    useEffect(() => {
        if (!user) {
            router.push("/login");
        }
    }, [user, router]);

    // Part A: Stop rendering until user is loaded
    if (!user) return null;


    const handleFileUpload = async (file) => {

        if (!file) return;

        try {
            // 1. Request pre-signed URL
            const result = await apiFetch(`${env.backendApi}/api/uploadAsset`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileType: file.type,
                    }),
                }
            );

            if (result?.ok) {
                const res = await result.json();

                const { uploadUrl, fileUrl } = res;



                // Step 2: Upload file directly to S3
                const answer = await apiFetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": file.type },
                    body: file,
                });



                if (answer.ok) {
                    toast.success(`File uploaded !!`);


                    // api call to upload metadata
                    const assetResponse = await apiFetch(
                        `${env.backendApi}/api/assets/create`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                            },
                            body: JSON.stringify({
                                fileName: file.name,
                                fileType: file.type,
                                fileUrl: fileUrl, // S3 file URL
                                userId: user?.userId
                            }),
                        }
                    );

                    if (!assetResponse.ok) throw new Error("Failed to save asset metadata");

                    const assetData = await assetResponse.json();


                    // const mockAsset = {
                    //     id: Date.now().toString(),
                    //     name: file.name,
                    //     type: file.type,
                    //     size: file.size,
                    //     dateAdded: new Date().toISOString(),
                    //     addedBy: 'Current User',
                    //     url: fileUrl,
                    //     thumbnail: URL.createObjectURL(file),
                    //     dimensions: '3915 x 5872 px',
                    //     dpi: '72 DPI',
                    //     description: '',
                    //     tags: ['uploaded', 'new'],
                    //     assetType: file.type.startsWith('image/') ? 'Photography' :
                    //         file.type.startsWith('video/') ? 'Video' : 'Document',
                    //     assetSubType: 'User Upload'
                    // };
                    const mockAsset = {
                        ...assetData?.data,       // real backend response
                        id: assetData?.data?.assetId || Date.now().toString(),
                        thumbnail: assetData?.data?.url || URL.createObjectURL(file),
                        description: assetData?.data?.description || '',
                        tags: assetData?.data?.tags || ['uploaded', 'new'],
                        assetSubType: assetData?.data?.assetSubType || 'User Upload'
                    };


                    setUploadedAsset(mockAsset);
                    setAssets(prev => [...prev, mockAsset]);
                    setCurrentView('detail');
                } else {
                    const errorText = await answer.text(); // S3 sends XML error
                    console.error("S3 upload failed:", errorText);
                    toast.error("Upload failed. Check console for details.");
                }


            }
        } catch (error) {
            toast.error('Error uploadig file in DAM' + error?.message);
        }




    };

    const handleBackToLibrary = () => {
        setCurrentView('library');
        setUploadedAsset(null);
    };

    const handleShowUpload = () => {
        setCurrentView('upload');
    };

    return (
        <div className="w-full min-h-screen">
            {currentView === 'library' && (
                <div className="flex">
                    {user?.role === "journalist" ? <DashboardSidebar /> : <SideBar />}
                    <div className="flex-1">
                        <div className="p-4 bg-white border-b flex justify-between items-center">
                            <h1 className="text-xl font-semibold">Digital Asset Management</h1>
                            <button
                                onClick={handleShowUpload}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Upload New Asset
                            </button>
                        </div>
                        <AssetLibrary assets={assets} />
                    </div>
                </div>
            )}

            {currentView === 'upload' && (
                <div className="flex">
                    {user?.role === "journalist" ? <DashboardSidebar /> : <SideBar />}
                    <div className="flex-1">
                        <div className="p-4 bg-white border-b">
                            <BackToDashboardButton
                                onClick={handleBackToLibrary}
                                label="Back to Media"
                                shortLabel="Media"
                                className="mb-2"
                            />
                        </div>
                        <UploadComponent onFileUpload={handleFileUpload} />
                    </div>
                </div>
            )}

            {currentView === 'detail' && uploadedAsset && (
                <div className="flex">
                    {user?.role === "journalist" ? <DashboardSidebar /> : <SideBar />}
                    <AssetDetailView
                        asset={uploadedAsset}
                        onBack={handleBackToLibrary}
                    />
                </div>
            )}
        </div>
    );
};

export default DAMContainer;
